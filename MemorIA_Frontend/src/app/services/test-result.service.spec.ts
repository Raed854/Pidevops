import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestResultService } from './test-result.service';
import { environment } from '../../environments/environment';
import { TestResult } from '../models/cognitive-models';

describe('TestResultService', () => {
    let service: TestResultService;
    let httpMock: HttpTestingController;
    const apiUrl = environment.apiUrl + '/test-results';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [TestResultService]
        });
        service = TestBed.inject(TestResultService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should fetch results by patient id', () => {
        const mockResults: TestResult[] = [
            { id: 1, patientId: 101, scoreTotale: 28 }
        ] as any;

        service.getByPatient(101).subscribe(results => {
            expect(results.length).toBe(1);
            expect(results[0].scoreTotale).toBe(28);
        });

        const req = httpMock.expectOne(`${apiUrl}/patient/101`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResults);
    });

    it('should create a test result', () => {
        const newResult = { patientId: 101, scoreTotale: 30 } as any;

        service.create(newResult).subscribe(result => {
            expect(result).toEqual(newResult);
        });

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        req.flush(newResult);
    });
});
