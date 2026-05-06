import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CognitiveTestService } from './cognitive-test.service';
import { environment } from '../../environments/environment';
import { CognitiveTest, TestType } from '../models/cognitive-models';

describe('CognitiveTestService', () => {
    let service: CognitiveTestService;
    let httpMock: HttpTestingController;
    const apiUrl = environment.apiUrl + '/cognitive-tests';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [CognitiveTestService]
        });
        service = TestBed.inject(CognitiveTestService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch all tests', () => {
        const mockTests: CognitiveTest[] = [
            { id: 1, titre: 'Test 1', type: TestType.MEMORY }
        ] as any;

        service.getAll().subscribe(tests => {
            expect(tests.length).toBe(1);
            expect(tests).toEqual(mockTests);
        });

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('GET');
        req.flush(mockTests);
    });

    it('should fetch test by id', () => {
        const mockTest = { id: 1, titre: 'Test 1' } as any;

        service.getById(1).subscribe(test => {
            expect(test).toEqual(mockTest);
        });

        const req = httpMock.expectOne(`${apiUrl}/1`);
        expect(req.request.method).toBe('GET');
        req.flush(mockTest);
    });

    it('should create a new test', () => {
        const newTest = { titre: 'New Test' } as any;

        service.create(newTest).subscribe(test => {
            expect(test).toEqual(newTest);
        });

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        req.flush(newTest);
    });
});
